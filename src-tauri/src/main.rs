// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs::create_dir_all,
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};
use tauri::{Manager, RunEvent};
mod service_logs;
use tauri_plugin_shell::{
    process::{Command, CommandChild, CommandEvent},
    Error as ShellError, ShellExt,
};

struct SidecarProcesses(Mutex<Vec<CommandChild>>);

impl SidecarProcesses {
    fn stop(&self) {
        if let Ok(mut children) = self.0.lock() {
            for child in children.drain(..) {
                let _ = child.kill();
            }
        }
    }
}

fn write_sidecar_log(log_path: &Path, message: &str) {
    let _ = service_logs::append_log(log_path, message);
}

fn write_process_log(log_path: &Path, name: &str, channel: &str, message: &str) {
    let _ = service_logs::record_process_message(log_path, name, channel, message);
}

fn proxy_https_is_available() -> bool {
    let https_address = SocketAddr::from(([127, 0, 0, 1], 9443));
    let deadline = Instant::now() + Duration::from_secs(3);

    while Instant::now() < deadline {
        if TcpStream::connect_timeout(&https_address, Duration::from_millis(200)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(100));
    }

    false
}

fn start_sidecar(
    name: &'static str,
    command: Result<Command, ShellError>,
    log_path: &Path,
) -> Option<CommandChild> {
    let command = match command {
        Ok(command) => command,
        Err(error) => {
            write_process_log(
                log_path,
                name,
                "error",
                &format!("failed to resolve: {error}"),
            );
            return None;
        }
    };

    match command.spawn() {
        Ok((mut events, child)) => {
            write_process_log(
                log_path,
                name,
                "lifecycle",
                &format!("started with process id {}", child.pid()),
            );

            let event_log_path = log_path.to_path_buf();
            tauri::async_runtime::spawn(async move {
                while let Some(event) = events.recv().await {
                    match event {
                        CommandEvent::Stderr(bytes) => write_process_log(
                            &event_log_path,
                            name,
                            "stderr",
                            &String::from_utf8_lossy(&bytes),
                        ),
                        CommandEvent::Error(error) => {
                            write_process_log(&event_log_path, name, "error", &error)
                        }
                        CommandEvent::Terminated(payload) => write_process_log(
                            &event_log_path,
                            name,
                            "lifecycle",
                            &format!("exited with code {:?}", payload.code),
                        ),
                        CommandEvent::Stdout(bytes) => write_process_log(
                            &event_log_path,
                            name,
                            "stdout",
                            &String::from_utf8_lossy(&bytes),
                        ),
                        _ => {}
                    }
                }
            });

            Some(child)
        }
        Err(error) => {
            write_process_log(
                log_path,
                name,
                "error",
                &format!("failed to start: {error}"),
            );
            None
        }
    }
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let resource_dir = app.path().resource_dir()?;
            let log_path = app.path().app_log_dir()?.join("sidecars.log");
            if let Some(log_dir) = log_path.parent() {
                let _ = create_dir_all(log_dir);
            }
            write_sidecar_log(&log_path, "--- Dwarfium desktop starting ---");

            let mut children = Vec::new();
            if let Some(proxy) = start_sidecar(
                "DwarfiumProxy",
                app.shell()
                    .sidecar("DwarfiumProxy")
                    .map(|command| command.current_dir(&resource_dir)),
                &log_path,
            ) {
                children.push(proxy);
            }

            let mediamtx_config_name = if proxy_https_is_available() {
                "mediamtx-https.yml"
            } else {
                "mediamtx.yml"
            };
            write_sidecar_log(
                &log_path,
                &format!("using MediaMTX configuration {mediamtx_config_name}"),
            );
            let mediamtx_config: PathBuf = resource_dir.join(mediamtx_config_name);
            if let Some(mediamtx) = start_sidecar(
                "MediaMTX",
                app.shell()
                    .sidecar("mediamtx")
                    .map(|command| command.arg(&mediamtx_config).current_dir(&resource_dir)),
                &log_path,
            ) {
                children.push(mediamtx);
            }

            app.manage(SidecarProcesses(Mutex::new(children)));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit) {
            if let Some(processes) = app_handle.try_state::<SidecarProcesses>() {
                processes.stop();
            }
        }
    });
}
