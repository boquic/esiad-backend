#!/usr/bin/env bash
# Verificación funcional de auth/roles a través del reverse proxy.
# Uso:  bash verificar.sh           (usa http://localhost:8080)
#       BASE=http://localhost:8080 bash verificar.sh
set -u

BASE="${BASE:-http://localhost:8080}"
PASS=0; FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

PWD_TEST="Secret123"

# Genera valores de 8/9 dígitos con alta entropía (dni y phone son únicos).
gen_dni()   { printf "%08d" $(( ( (RANDOM<<15) | RANDOM ) % 100000000 )); }
gen_phone() { printf "9%08d" $(( ( (RANDOM<<15) | RANDOM ) % 100000000 )); }

echo "== Base: $BASE =="

# 0) Health
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
[ "$code" = "200" ] && ok "/health responde 200" || bad "/health devolvió $code (¿stack arriba?)"

# 1) Registro (201). Reintenta con otro DNI si hay colisión (409).
regcode=""
for i in 1 2 3 4 5; do
  DNI=$(gen_dni); PHONE=$(gen_phone)
  reg=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"dni\":\"$DNI\",\"first_name\":\"Test\",\"last_name\":\"User\",\"phone\":\"$PHONE\",\"password\":\"$PWD_TEST\"}")
  regcode=$(echo "$reg" | tail -n1)
  [ "$regcode" != "409" ] && break
done
{ [ "$regcode" = "201" ] || [ "$regcode" = "200" ]; } && ok "registro de DNI $DNI ($regcode)" || bad "registro devolvió $regcode"

# 2) Login -> token
login=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$DNI\",\"password\":\"$PWD_TEST\"}")
TOKEN=$(echo "$login" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] && ok "login devolvió token" || bad "login NO devolvió token -> $login"

# 3) Ruta protegida SIN token -> 401
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/orders/my")
[ "$code" = "401" ] && ok "GET /api/orders/my sin token -> 401" || bad "esperaba 401, obtuve $code"

# 4) Ruta protegida CON token (rol correcto CLIENT) -> 200
if [ -n "$TOKEN" ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/orders/my" -H "Authorization: Bearer $TOKEN")
  [ "$code" = "200" ] && ok "GET /api/orders/my con token CLIENT -> 200" || bad "esperaba 200, obtuve $code"

  # 5) Rol incorrecto: CLIENT contra ruta ADMIN -> 403
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/orders" -H "Authorization: Bearer $TOKEN")
  [ "$code" = "403" ] && ok "GET /api/admin/orders con token CLIENT -> 403" || bad "esperaba 403, obtuve $code"
fi

echo "== Resultado: $PASS OK / $FAIL fallos =="
[ "$FAIL" = "0" ]
