import { Body, Controller, Get, Post } from "@nestjs/common";
import { checkBonusQuestion, gradeBonusQuiz, publicBonusQuiz } from "./quiz_bonus";
import { checkQuestion, gradeQuiz, publicQuiz, type QuizAnswers } from "./quiz";
import { checkPspQuestion, gradePspQuiz, publicPspQuiz } from "./quiz_psp";
import { checkReconQuestion, gradeReconQuiz, publicReconQuiz } from "./quiz_recon";
import { checkRgQuestion, gradeRgQuiz, publicRgQuiz } from "./quiz_rg";

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

  @Get("quiz/rg")
  rgPaper() {
    return publicRgQuiz();
  }

  @Post("quiz/rg/check")
  rgCheck(@Body() body: { id?: string; answer?: QuizAnswers[string] }) {
    return checkRgQuestion(body.id ?? "", body.answer);
  }

  @Post("quiz/rg/grade")
  rgGrade(@Body() body: { answers?: QuizAnswers }) {
    return gradeRgQuiz(body.answers ?? {});
  }

  @Get("quiz/psp")
  pspPaper() {
    return publicPspQuiz();
  }

  @Post("quiz/psp/check")
  pspCheck(@Body() body: { id?: string; answer?: QuizAnswers[string] }) {
    return checkPspQuestion(body.id ?? "", body.answer);
  }

  @Post("quiz/psp/grade")
  pspGrade(@Body() body: { answers?: QuizAnswers }) {
    return gradePspQuiz(body.answers ?? {});
  }

  @Get("quiz/bonus")
  bonusPaper() {
    return publicBonusQuiz();
  }

  @Post("quiz/bonus/check")
  bonusCheck(@Body() body: { id?: string; answer?: QuizAnswers[string] }) {
    return checkBonusQuestion(body.id ?? "", body.answer);
  }

  @Post("quiz/bonus/grade")
  bonusGrade(@Body() body: { answers?: QuizAnswers }) {
    return gradeBonusQuiz(body.answers ?? {});
  }
}
