import { Module } from "@nestjs/common";
import { DeskController } from "./desk.controller";
import { DrillController } from "./drill.controller";
import { QuizController } from "./quiz.controller";
import { ReconController } from "./recon.controller";

@Module({
  controllers: [DeskController, QuizController, DrillController, ReconController],
})
export class AppModule {}
