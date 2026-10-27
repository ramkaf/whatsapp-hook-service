import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Controller("whatsapp-webhook")
export class WhatsappWebhookController {
  @Get()
  verify(@Req() req: Request, @Res() res: Response) {
    console.log("GET verification received");
    return res.status(200).send("OK");
  }

  @Post()
  @HttpCode(200)
  handleWebhook(@Body() body: any, @Req() req: Request) {
    console.log("recived webhook");
    return { status: "received" };
  }
}
