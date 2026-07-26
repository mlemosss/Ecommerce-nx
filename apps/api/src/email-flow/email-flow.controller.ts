import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { EmailFlowService } from './email-flow.service';

@Controller('email-flow')
export class EmailFlowController {
  constructor(private readonly emailFlowService: EmailFlowService) {}

  @Get()
  list() {
    return this.emailFlowService.list();
  }

  @Patch(':key')
  setEnabled(@Param('key') key: string, @Body('enabled') enabled: boolean) {
    return this.emailFlowService.setEnabled(key, enabled);
  }
}
