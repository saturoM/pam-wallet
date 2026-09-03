import { Body, Controller, Get, Post } from "@nestjs/common";
import { checkCard, gradeDrill, publicDrill, type DrillAnswers } from "./drill";

@Controller()
export class DrillController {
  @Get("drill")
  paper() {
    return publicDrill();
  }

  @Post("drill/check")
  check(@Body() body: { id?: string; answer?: DrillAnswers[string] }) {
    return checkCard(body.id ?? "", body.answer);
  }

  @Post("drill/grade")
  grade(@Body() body: { answers?: DrillAnswers }) {
    return gradeDrill(body.answers ?? {});
  }
}
