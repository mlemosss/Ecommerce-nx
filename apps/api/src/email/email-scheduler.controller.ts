import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { EmailSchedulerService } from './email-scheduler.service';

@Controller('email-flow')
export class EmailSchedulerController {
  constructor(private readonly scheduler: EmailSchedulerService) {}

  @Public()
  @Get('run-scheduled')
  runScheduled() {
    return this.scheduler.runScheduled();
  }
}
