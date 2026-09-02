import { Body, Controller, Get, Post } from "@nestjs/common";
import { checkQuestion, gradeQuiz, publicQuiz, type QuizAnswers } from "./quiz";

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
}
