# Google Chat por Stream — Documento simple para decisión

Fecha: abril 2026  
Audiencia: producto + ingeniería

---

## 1. Qué queremos resolver

Queremos que cada **stream** tenga su propia sección de comunicación para que:

- el **field-agent**
- el **org-admin**
- y otros admins si aplica

puedan hablar entre sí.

La idea es **NO construir un sistema de chat completo dentro de SecondStream**.  
La idea es que la conversación **viva en Google Workspace**, idealmente en **Google Chat**.

---

## 2. Respuesta corta

## Sí se puede

La forma más lógica es:

> **1 stream = 1 Google Chat space privado**

Eso significa:

- Stream de oil → su space
- Stream de gas → su space
- Stream de plástico → su space

Cada stream queda separado, con su propio historial y sus propios miembros.

---

## 3. Recomendación principal

### Recomendamos SÍ implementar la feature

Pero con este enfoque:

- Google Chat será el lugar donde realmente vive la conversación
- SecondStream solo mostrará una **versión simple** de esa conversación dentro del stream
- habrá un botón para abrir el chat completo en Google Chat

### Por qué recomendamos esto

Porque logra el objetivo principal del cliente:

> “que la conversación quede en Google Workspace”

y al mismo tiempo evita que nosotros construyamos un sistema de mensajería completo desde cero.

---

## 4. Decisión clave: `space` y no `thread`

## Recomendación

> **1 stream = 1 private Google Chat space**

## Por qué

Porque ustedes quieren que cada stream tenga:

- mensajes separados
- historial separado
- participantes separados
- notificaciones separadas

Eso lo resuelve mejor un **space**.

## Por qué NO un thread

Un thread en Google Chat:

- vive dentro de un space
- no tiene miembros propios
- no tiene permisos propios

Entonces un thread **no separa de verdad** un stream de otro.

### En simple

Si el stream se comporta como un mini proyecto, entonces necesita su propio **space**, no solo un thread.

---

## 5. Qué sí podemos hacer

Con Google Chat sí podemos:

- crear un space privado por stream
- meter al owner del stream
- meter a uno o varios org-admins
- guardar el historial en Google Chat
- leer mensajes
- enviar mensajes
- mostrar los últimos mensajes dentro de SecondStream
- abrir el chat completo en Google Chat

---

## 6. Qué NO podemos hacer directamente

Aquí está la limitación más importante de todo el análisis.

## NO existe un embed nativo de Google Chat

Eso significa que Google **no nos da**:

- un iframe oficial
- un widget oficial
- una forma de “pegar” el space completo dentro de nuestra app

## Entonces, ¿qué implica?

Si queremos ver mensajes dentro de SecondStream, sí tenemos que construir una **UI pequeña y simple** para mostrar ese space.

Pero eso es MUY distinto a construir un chat completo propio.

### En simple

No podemos meter Google Chat “tal cual” dentro de la plataforma.  
Sí podemos construir una **vista simple** de ese chat dentro del stream.

---

## 7. Cómo se vería la feature

Dentro del stream detail habría una card o bloque como:

### `Communication`

Con algo así:

- últimos mensajes
- nombre de quien escribió
- fecha/hora
- input para mandar mensaje
- botón `Open in Google Chat`

## Qué sí sería realista en v1

- ver mensajes recientes
- mandar mensajes simples
- refrescar casi en tiempo real
- abrir el chat completo en Google Chat

## Qué NO metería en v1

- experiencia completa tipo Slack
- unread perfecto multiusuario
- todas las funciones nativas de Chat
- reacciones, adjuntos complejos y estados avanzados si no son necesarios

---

## 8. Cómo se actualizaría

Esta es otra duda importante.

## Respuesta corta

Sí se puede actualizar bien.  
Pero no conviene hacerlo de una sola forma.

La mejor opción es un modelo **híbrido**.

## Cómo funcionaría

### 1. Cuando el usuario abre el stream
- SecondStream pide los mensajes recientes
- nuestro backend los trae del Google Chat space
- los mostramos en la card

### 2. Cuando entra un mensaje nuevo
- Google manda un evento
- nuestro backend lo procesa
- el frontend se actualiza

### 3. Si un evento se pierde
- hacemos una reconciliación periódica
- eso corrige desfases y evita huecos

## Por qué así

Porque:

- solo polling = más lento o más costoso
- solo eventos = más frágil si algo falla

Entonces el enfoque híbrido da el mejor balance.

### En simple

La UI se puede sentir **casi en tiempo real**, sin necesidad de construir un chat full custom.

---

## 9. ¿Esto de verdad reduce complejidad?

## Sí, pero no a cero

### Lo que sí evitamos

- construir un sistema de mensajería completo
- guardar toda la conversación como sistema principal nuestro
- diseñar permisos completos de chat desde cero
- diseñar notificaciones de chat completas desde cero

### Lo que sí tendremos que construir

- la conexión con Google Workspace
- la relación tenant ↔ Google
- la relación stream ↔ Google Chat space
- una mini UI para ver/enviar mensajes
- la sincronización de mensajes

## La idea correcta

> No estamos evitando TODO el trabajo.  
> Estamos evitando el trabajo más grande y más caro: construir mensajería completa propia.

---

## 10. OAuth y multi-tenant

Esta parte hay que entenderla bien porque aquí suele haber confusión.

## Hay dos cosas distintas

### A. Login a SecondStream
Esto responde:

> ¿Quién es el usuario dentro de nuestra app?

Esto se puede resolver con:

- Cognito
- auth propia
- Google login
- otro proveedor

### B. Permiso para usar Google Chat del cliente
Esto responde:

> ¿Qué tenant autorizó a SecondStream a conectarse a su Google Workspace?

Eso requiere una **conexión Google por tenant**.

## Lo importante

> Login con Google NO significa permiso automático para usar Google Chat API.

Son dos cosas distintas.

## Decisión recomendada

- el `org-admin` conecta Google Workspace una vez por tenant
- guardamos esa conexión por tenant
- luego cada stream crea o vincula su propio space

## Por qué

Porque esto es lo correcto para un producto B2B multi-tenant.

---

## 11. Complejidad real

## Si hacemos la versión recomendada

### Alcance
- 1 space por stream
- ver mensajes recientes
- mandar mensajes
- refresh casi en tiempo real
- abrir en Google Chat

### Complejidad
**Media**

### Riesgo
**Medio**

### Valor
**Alto**

## Si intentamos hacer un chat casi completo dentro de SecondStream

### Complejidad
**Alta**

### Riesgo
**Alto**

### Valor extra
No necesariamente justifica el esfuerzo.

---

## 12. Costos

## Costo principal

El costo principal no parece estar en “pagar por cada mensaje a Google”.  
El costo real está más en:

- integración
- sincronización
- soporte multi-tenant
- mantenimiento

## En simple

No se ve como una feature cara por uso de API.  
Se ve como una feature de **complejidad operativa media**.

---

## 13. Riesgos más importantes

### Riesgo 1
Pensar que Google Chat se puede embedir completo sin construir nada.  
**No se puede.**

### Riesgo 2
Pensar que login con Google ya resuelve permisos de Workspace.  
**No los resuelve.**

### Riesgo 3
Prometer una experiencia igual a Google Chat nativo.  
**No deberíamos prometer eso.**

### Riesgo 4
Querer meter demasiadas funciones en v1.  
Eso subiría mucho la complejidad.

---

## 14. Recomendación final

## Sí vale la pena implementarlo

### Pero solo si el alcance es este:

- **1 stream = 1 private Google Chat space**
- Google Chat es la conversación canónica
- SecondStream muestra una vista simple del space
- el usuario puede mandar mensajes simples
- el usuario puede abrir el chat completo en Google Chat

## No lo recomendaría si quieren:

- un chat full dentro de la plataforma
- replicar toda la experiencia nativa de Chat
- evitar completamente cualquier complejidad técnica

---

## 15. Recomendación de producto para v1

### V1 recomendada

- crear un Google Chat space por stream
- agregar owner + admins
- mostrar últimos mensajes
- permitir enviar mensaje
- actualizar casi en tiempo real
- botón `Open in Google Chat`

### Por qué esta v1

Porque:

- cumple el objetivo del cliente
- mantiene la conversación en Google Workspace
- evita construir mensajería completa
- es una versión razonable de implementar

---

## 16. Conclusión final en una frase

> **Sí deberíamos hacerlo, pero como una integración simple y limitada con Google Chat, no como un cliente completo de chat dentro de SecondStream.**

---

## 17. Siguiente paso sugerido

Si el equipo dice que sí, el siguiente paso debería ser:

### un diseño técnico corto con:
- flujo OAuth por tenant
- modelo de datos
- cómo se crean los spaces
- cómo se sincronizan los mensajes
- UX final de la card `Communication`
