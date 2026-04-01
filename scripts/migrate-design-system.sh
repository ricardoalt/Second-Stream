#!/bin/bash

# Script de migración para el Design System Editorial
# Identifica colores hardcodeados y anti-patrones en el código

echo "🔍 Analizando código para migración al Design System Editorial..."
echo ""

# Colores hardcodeados a buscar
echo "📊 COLORES HARDCODEADOS ENCONTRADOS:"
echo "===================================="
echo ""

echo "🟢 Emerald (debería ser 'success'):"
grep -r "bg-emerald-\|text-emerald-\|border-emerald-" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "🟠 Amber (debería ser 'warning'):"
grep -r "bg-amber-\|text-amber-\|border-amber-" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "🟣 Violet/Purple (debería ser 'primary' o 'info'):"
grep -r "bg-violet-\|text-violet-\|bg-purple-\|text-purple-" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "🔵 Cyan/Blue (debería ser 'info'):"
grep -r "bg-cyan-\|text-cyan-\|bg-blue-\|text-blue-" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "🔴 Red/Rose (debería ser 'destructive'):"
grep -r "bg-red-\|text-red-\|bg-rose-\|text-rose-" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "🟡 Yellow (debería ser 'warning'):"
grep -r "bg-yellow-\|text-yellow-" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "===================================="
echo ""

# Anti-patrones
echo "⚠️  ANTI-PATRONES ENCONTRADOS:"
echo "===================================="
echo ""

echo "space-y-* (debería ser flex flex-col gap-*):"
grep -r "space-y-" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "w-* h-* juntos (debería ser size-*):"
grep -rE "w-[0-9]+.*h-[0-9]+|h-[0-9]+.*w-[0-9]+" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "size-" | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "border-b/border-t para separar secciones (No-Line Rule):"
grep -rE "border-b|border-t|border-l|border-r" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | xargs echo "  Total encontrados:"

echo ""
echo "===================================="
echo ""

# Archivos que necesitan atención
echo "📁 ARCHIVOS CON MAYOR CANTIDAD DE PROBLEMAS:"
echo "===================================="
echo ""

echo "Top 10 archivos con colores hardcodeados:"
grep -rlE "(bg|text|border)-(emerald|amber|violet|purple|cyan|blue|red|rose|yellow|pink)-[0-9]+" \
  /Users/ricardoaltamirano/Developer/SecondStream/frontend/components/ \
  --include="*.tsx" 2>/dev/null | while read file; do
  count=$(grep -cE "(bg|text|border)-(emerald|amber|violet|purple|cyan|blue|red|rose|yellow|pink)-[0-9]+" "$file" 2>/dev/null)
  echo "  $count - $file"
done | sort -rn | head -10

echo ""
echo "===================================="
echo ""
echo "✅ PRÓXIMOS PASOS:"
echo ""
echo "1. Reemplazar colores hardcodeados con tokens:"
echo "   bg-emerald-500 → bg-success"
echo "   bg-amber-500 → bg-warning"
echo "   bg-violet-500 → bg-primary"
echo "   bg-cyan-500 → bg-info"
echo "   bg-red-500 → bg-destructive"
echo ""
echo "2. Reemplazar anti-patrones:"
echo "   space-y-4 → flex flex-col gap-4"
echo "   w-10 h-10 → size-10"
echo ""
echo "3. Usar componentes de sistema:"
echo "   <Card className=\"bg-emerald-500\"> → <EditorialCard variant=\"decision\" decision=\"go\">"
echo "   <Badge className=\"bg-amber-500\"> → <StatusChip status=\"investigate\">"
echo ""
echo "Para más información, ver: docs/EDITORIAL_DESIGN_SYSTEM.md"
