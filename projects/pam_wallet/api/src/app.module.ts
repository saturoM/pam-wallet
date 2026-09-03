import { Module } from "@nestjs/common";
import { DeskController } from "./desk.controller";
import { DrillController } from "./drill.controller";
import { QuizController } from "./quiz.controller";

@Module({
  controllers: [DeskController, QuizController, DrillController],
})
export class AppModule {}
