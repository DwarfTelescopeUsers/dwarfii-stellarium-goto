import Link from "next/link";
import StatusBar from "@/components/shared/StatusBar";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

export default function About() {
  useSetupConnection();
  useLoadIntialValues();

  return (
      <div><section className="daily-horp d-inline-block w-100">
          <div className="container"> <br /><br /><br /><br /><br />
      
              <div className="container">
                  <h1>This page is under construction</h1>
                  <p>We'll be here soon with our new awesome site.</p>
              </div>
              <br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br />
         </div> </section>
          <style jsx>{`
        .container {
  
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  padding: 10px;
}

h1 {
  font-size: 2em;
  margin-bottom: 10px;
}

p {
  font-size: 1.2em;
}
      `}</style>
    </div>
  );
}
