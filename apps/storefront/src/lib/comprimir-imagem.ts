/**
 * Reduz a foto no navegador antes de mandar.
 *
 * Foto de celular hoje sai com 4 a 8 MB. Sem reduzir, o envio trava na rede da
 * cliente e ela desiste — e uma avaliação perdida por causa do tamanho do
 * arquivo é a pior forma de perder uma avaliação.
 *
 * Estava dentro do formulário de avaliação de produto; virou arquivo próprio
 * quando a avaliação da loja passou a precisar do mesmo.
 */

const MAX_LADO = 1400;
const QUALIDADE = 0.82;

export async function comprimirImagem(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  if (typeof document === 'undefined' || !file.type.startsWith('image/')) return dataUrl;

  try {
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.src = dataUrl;
    });

    const maior = Math.max(img.width, img.height);
    const escala = maior > MAX_LADO ? MAX_LADO / maior : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * escala));
    canvas.height = Math.max(1, Math.round(img.height * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Foto já pequena pode ficar MAIOR depois de reprocessada: fica a original.
    const menor = canvas.toDataURL('image/jpeg', QUALIDADE);
    return menor.length < dataUrl.length ? menor : dataUrl;
  } catch {
    return dataUrl;
  }
}
