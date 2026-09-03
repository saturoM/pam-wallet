import { Body, Controller, Get, Post } from "@nestjs/common";
import { checkQuestion, gradeQuiz, publicQuiz, type QuizAnswers } from "./quiz";
import { checkReconQuestion, gradeReconQuiz, publicReconQuiz } from "./quiz_recon";

@Controller()
export class QuizController {
  @Get("quiz")
  paper() {
    return publicQuiz();
  }

  @Post("quiz/check")
  check(@Body() body: { id?: string; answer?: QuizAnswers[string] }) {
    return checkQuestion(body.id ?? "", body.answer);
  }

  @Post("quiz/grade")
  grade(@Body() body: { answers?: QuizAnswers }) {
    return gradeQuiz(body.answers ?? {});
  }

  @Get("quiz/recon")
  reconPaper() {
    return publicReconQuiz();
  }

  @Post("quiz/recon/check")
  reconCheck(@Body() body: { id?: string; answer?: QuizAnswers[string] }) {
    return checkReconQuestion(body.id ?? "", body.answer);
  }

  @Post("quiz/recon/grade")
  reconGrade(@Body() body: { answers?: QuizAnswers }) {
    return gradeReconQuiz(body.answers ?? {});
  }
}
