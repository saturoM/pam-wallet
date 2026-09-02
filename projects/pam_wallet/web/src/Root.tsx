import { useEffect, useState } from "react";
import { App } from "./App";
import { Exam } from "./Exam";

export function Root() {
  const [exam, setExam] = useState(() => location.hash.startsWith("#/exam"));
  useEffect(() => {
    const sync = () => setExam(location.hash.startsWith("#/exam"));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return exam ? <Exam /> : <App />;
}
