import { Test } from '@nestjs/testing';
import { AppModule } from '../app/app.module';

// O build do TypeScript não pega dependência de módulo não importada — só o
// Nest, ao montar. É o erro que passa no CI e derruba a API no primeiro
// request.
it('o AppModule resolve todas as dependências', async () => {
  process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  expect(mod).toBeDefined();
}, 60000);
