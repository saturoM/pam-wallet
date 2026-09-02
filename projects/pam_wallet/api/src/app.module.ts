import { Module } from "@nestjs/common";
import { DeskController } from "./desk.controller";
import { QuizController } from "./quiz.controller";

@Module({
  controllers: [DeskController, QuizController],
})
export class AppModule {}
