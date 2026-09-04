import { useEffect, useState } from "react";
import { App } from "./App";
import { Drill } from "./Drill";
import { Exam } from "./Exam";

function route():
  | "exam-bonus"
  | "exam-psp"
  | "exam-rg"
  | "exam-recon"
  | "exam"
  | "drill"
  | "desk" {
  if (location.hash.startsWith("#/exam-bonus")) return "exam-bonus";
  if (location.hash.startsWith("#/exam-psp")) return "exam-psp";
  if (location.hash.startsWith("#/exam-rg")) return "exam-rg";
  if (location.hash.startsWith("#/exam-recon")) return "exam-recon";
  if (location.hash.startsWith("#/exam")) return "exam";
  if (location.hash.startsWith("#/drill")) return "drill";
  return "desk";
}

export function Root() {
  const [page, setPage] = useState(route);
  useEffect(() => {
    const sync = () => setPage(route());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  if (page === "exam-bonus") return <Exam pack="bonus" />;
  if (page === "exam-psp") return <Exam pack="psp" />;
  if (page === "exam-rg") return <Exam pack="rg" />;
  if (page === "exam-recon") return <Exam pack="recon" />;
  if (page === "exam") return <Exam pack="money" />;
  if (page === "drill") return <Drill />;
  return <App />;
}
