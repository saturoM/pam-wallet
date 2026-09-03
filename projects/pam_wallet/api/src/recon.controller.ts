import { Controller, Post } from "@nestjs/common";
import { pamService } from "./pam.service";

@Controller()
export class ReconController {
  @Post("recon")
  run() {
    return pamService.runRecon();
  }

  @Post("recon/plant/fee")
  plantFee() {
    return pamService.plantPspFee();
  }

  @Post("recon/plant/chargeback")
  plantChargeback() {
    return pamService.plantPspChargeback();
  }

  @Post("recon/plant/ghost-capture")
  plantGhost() {
    return pamService.plantGhostCapture();
  }

  @Post("recon/fix/fee")
  fixFee() {
    return pamService.postPspFee();
  }

  @Post("recon/fix/chargeback")
  fixChargeback() {
    return pamService.postChargeback();
  }

  @Post("recon/fix/adjust")
  adjust() {
    return pamService.reconAdjust();
  }
}
