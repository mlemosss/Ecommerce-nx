/**
 * Injeta um bloco JSON-LD na página.
 *
 * `dangerouslySetInnerHTML` é o jeito certo aqui, e não um descuido: dentro de
 * `<script type="application/ld+json">` o conteúdo não é HTML, e o React
 * escaparia as aspas do JSON até quebrá-lo. O dado vem de `JSON.stringify` de
 * objeto montado no servidor, nunca de texto solto.
 *
 * O `</` escapado fecha o único buraco real: um nome de produto contendo
 * `</script>` encerraria a tag mais cedo e o resto viraria HTML na página.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
