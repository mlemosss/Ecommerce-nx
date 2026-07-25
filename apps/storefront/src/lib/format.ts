export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatInstallments(value: number, times = 3): string {
  return `${times}x de ${formatPrice(value / times)} sem juros`;
}
