use std::{
    fs::{create_dir_all, OpenOptions},
    io::{self, Write},
    path::Path,
};

pub fn append_log(path: &Path, message: &str) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        create_dir_all(parent)?;
    }
    let mut log = OpenOptions::new().create(true).append(true).open(path)?;
    writeln!(log, "{}", message.trim_end_matches(&['\r', '\n'][..]))
}

/// Keep the raw service output in the same named files as standalone, plus
/// the desktop's combined lifecycle/output log for backwards compatibility.
pub fn record_process_message(
    combined: &Path,
    name: &str,
    channel: &str,
    message: &str,
) -> io::Result<()> {
    let filename = match name {
        "DwarfiumProxy" => "DwarfiumProxy.log",
        "MediaMTX" => "mediamtx.log",
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Unknown service log",
            ))
        }
    };
    let service_result = append_log(&combined.with_file_name(filename), message);
    let combined_result = append_log(combined, &format!("{name} {channel}: {message}"));
    service_result.and(combined_result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        env, fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn combined_log_still_records_if_the_service_file_cannot_open() {
        let root = env::temp_dir().join(format!(
            "dwarfium-log-fallback-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let combined = root.join("sidecars.log");
        let blocked = root.join("DwarfiumProxy.log");
        fs::create_dir_all(&blocked).unwrap();
        assert!(
            record_process_message(&combined, "DwarfiumProxy", "stderr", "keep this error")
                .is_err()
        );
        assert!(fs::read_to_string(&combined)
            .unwrap()
            .contains("keep this error"));
        fs::remove_file(combined).unwrap();
        fs::remove_dir(blocked).unwrap();
        fs::remove_dir(root).unwrap();
    }

    #[test]
    fn service_output_and_errors_survive_reopen_without_mixing_services() {
        let root = env::temp_dir().join(format!(
            "dwarfium-service-log-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let combined = root.join("sidecars.log");
        record_process_message(&combined, "DwarfiumProxy", "stdout", "  proxy ready\r\n").unwrap();
        record_process_message(&combined, "DwarfiumProxy", "stderr", "connection failed").unwrap();
        record_process_message(&combined, "MediaMTX", "stdout", "video ready").unwrap();
        // Each write reopens the file, as it does across app runs.
        record_process_message(&combined, "DwarfiumProxy", "stdout", "proxy restarted").unwrap();
        assert_eq!(
            fs::read_to_string(root.join("DwarfiumProxy.log")).unwrap(),
            "  proxy ready\nconnection failed\nproxy restarted\n"
        );
        assert_eq!(
            fs::read_to_string(root.join("mediamtx.log")).unwrap(),
            "video ready\n"
        );
        let all = fs::read_to_string(&combined).unwrap();
        assert!(all.contains("DwarfiumProxy stderr: connection failed"));
        assert!(all.contains("MediaMTX stdout: video ready"));
        assert!(record_process_message(&combined, "../other", "stdout", "bad").is_err());
        for filename in ["DwarfiumProxy.log", "mediamtx.log", "sidecars.log"] {
            fs::remove_file(root.join(filename)).unwrap();
        }
        fs::remove_dir(root).unwrap();
    }
}
