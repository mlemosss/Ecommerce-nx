#!/bin/sh
# `prisma migrate deploy`, com nova tentativa.
#
# O deploy da API morreu com P1002: "Timed out trying to acquire a postgres
# advisory lock". Nao e erro de migracao nem de codigo — e o Neon acordando de
# suspensao, ou outro deploy segurando o lock ao mesmo tempo. O banco responde
# alguns segundos depois; a essa altura o build ja tinha ido embora, e a API
# ficou uma versao atras da loja.
#
# Tres tentativas com 15s de intervalo cobrem a suspensao do Neon e um deploy
# concorrente. Erro de verdade — SQL invalido, coluna que ja existe — falha
# igual nas tres, e ai o build tem que quebrar mesmo.
#
# stderr passa direto, sem redirecionamento: esconder a saida do prisma foi o
# que ja disfarcou um erro de schema por dois deploys.
set -e

MAX=3

tentativa=1
while [ "$tentativa" -le "$MAX" ]; do
  if npx prisma migrate deploy --schema prisma/schema.prisma; then
    exit 0
  fi

  if [ "$tentativa" -lt "$MAX" ]; then
    echo "migrate deploy falhou (tentativa $tentativa de $MAX). Nova tentativa em 15s."
    sleep 15
  fi

  tentativa=$((tentativa + 1))
done

echo "migrate deploy falhou nas $MAX tentativas. O build para aqui de proposito:"
echo "subir a API com o banco fora do esquema esperado quebra a loja inteira."
exit 1
