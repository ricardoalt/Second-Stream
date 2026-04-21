# SecondStream — Arquitectura de agentes IA

> Documento orientado a producto / project management.
> Objetivo: explicar **cómo estamos diseñando y operando la capa de agentes**, sin entrar al detalle de cada agente individual.

---

## 1. Resumen ejecutivo

En SecondStream no tratamos a los agentes como una colección de prompts sueltos ni como una solución “prehecha” amarrada a un proveedor.

Lo que estamos construyendo es una **arquitectura de orquestación** donde:

- el **producto define el flujo**,
- el **backend controla el contexto, reglas y validaciones**,
- los **modelos ejecutan tareas cognitivas especializadas**,
- y la plataforma puede **cambiar de modelo, proveedor o framework sin rehacer el sistema**.

La idea clave es esta:

> **No estamos comprando una inteligencia cerrada. Estamos definiendo un harness propio.**

Ese harness es la pieza que nos permite combinar lo mejor de ambos mundos:

- la velocidad de evolución de los modelos,
- con el control, trazabilidad y confiabilidad de una arquitectura de software seria.

---

## 2. Qué entendemos por “agente”

Para nosotros, un agente es una **capacidad de negocio encapsulada**.

No es “un bot genérico”.
Es una unidad de software que:

1. recibe un objetivo,
2. recibe contexto preparado por el sistema,
3. puede usar herramientas cuando haga sentido,
4. produce una salida estructurada,
5. y pasa por validaciones antes de impactar el producto.

Ejemplos de capacidades que hoy existen o estamos formalizando:

- análisis de documentos,
- análisis de imágenes,
- generación de propuestas,
- chat contextual,
- extracción de datos desde inputs complejos,
- síntesis de notas e insights.

La lógica importante NO vive “dentro del modelo”.
La lógica importante vive en nuestra arquitectura.

---

## 3. La pieza central: el harness

La mejor forma de entender nuestro enfoque es pensar en un **harness**.

El modelo por sí solo solo sabe procesar tokens de entrada y producir tokens de salida.
El harness es lo que lo vuelve útil dentro del producto.

### El harness se encarga de:

- seleccionar el agente correcto para cada flujo,
- preparar el contexto correcto,
- elegir el modelo adecuado para la tarea,
- inyectar instrucciones y reglas,
- conectar herramientas externas,
- validar la salida,
- registrar trazas, errores y metadatos,
- decidir cuándo aceptar, reintentar o escalar.

### Visualmente

```text
Usuario / UI
    ↓
Producto define intención
    ↓
Backend / Harness prepara contexto + reglas + herramientas
    ↓
Agente ejecuta sobre el modelo configurado
    ↓
Salida validada + normalizada
    ↓
Aplicación persiste, muestra o desencadena la siguiente acción
```

Esto es IMPORTANTE porque evita dos errores comunes:

1. meter toda la lógica en prompts,
2. acoplar el producto a un proveedor específico de IA.

---

## 4. Qué framework usamos hoy y para qué

Hoy el runtime principal de agentes en backend está implementado con **PydanticAI** sobre **FastAPI**.

Lo usamos porque nos resuelve muy bien problemas prácticos:

- definición clara de agentes,
- manejo de dependencias/contexto,
- outputs tipados,
- validación con Pydantic,
- integración limpia con Python,
- mejor estructura para observabilidad y control.

### Pero el punto estratégico no es “PydanticAI”

PydanticAI es el **runtime actual**, no la apuesta irreversible.

Nuestra arquitectura está pensada para que el framework sea una capa reemplazable. En otras palabras:

- hoy podemos usar PydanticAI,
- mañana podríamos mezclar o migrar piezas a otro runtime,
- y el contrato de negocio seguiría siendo el mismo.

Eso es posible porque estamos separando:

- **capacidad de negocio**,
- **orquestación/harness**,
- **proveedor del modelo**,
- **herramientas externas**.

---

## 5. Cómo se conectan los agentes con los modelos

Hoy, la mayoría de nuestros agentes consumen modelos vía **AWS Bedrock**, principalmente usando **Claude Sonnet 4.6**.

Adicionalmente, algunas capacidades especializadas pueden usar otros proveedores. Un ejemplo actual es la **transcripción de audio**, que va por **OpenAI `gpt-4o-transcribe`**.

### Patrón actual

- **Backend del producto:** FastAPI
- **Runtime de agentes:** PydanticAI
- **Proveedor principal de modelos:** AWS Bedrock
- **Modelo principal actual:** Claude Sonnet 4.6
- **Proveedor especializado adicional:** OpenAI para transcripción

### Lo importante no es el modelo puntual

La configuración de modelos está externalizada por tipo de tarea. Eso nos permite asignar modelos distintos según la capacidad:

- texto,
- propuesta,
- documento,
- imagen,
- audio/transcripción.

### Visualmente

```text
Capacidad de negocio
    ↓
Contrato del agente
    ↓
Selector/configuración de modelo
    ↓
Proveedor (Bedrock / OpenAI / futuro)
    ↓
Modelo concreto
```

Esto evita que el producto dependa de “un solo modelo mágico”.

---

## 6. Por qué nuestros agentes funcionan sin importar el modelo

La respuesta corta: porque **diseñamos contratos y no dependencias implícitas**.

Nuestros agentes no deberían depender de una personalidad específica del modelo, sino de un conjunto de capas controladas:

### a) Contrato de entrada
El sistema define qué contexto recibe el agente y en qué formato.

### b) Contrato de salida
El agente debe devolver una estructura válida, no solo texto bonito.

### c) Validación determinística
La aplicación decide si la respuesta sirve o no sirve.

### d) Herramientas y contexto fuera del modelo
La memoria operativa, los datos, las reglas y las integraciones viven fuera del LLM.

### e) Routing por capacidad
Si un modelo es mejor para una tarea y otro para otra, podemos enrutar sin cambiar el diseño de producto.

---

## 7. Qué define SecondStream y qué NO viene “prehecho”

Es importante aclarar esto porque desde fuera puede parecer que “ya existe un sistema de agentes y solo lo estamos conectando”.

NO es así.

Lo que estamos definiendo nosotros es la parte más valiosa:

- qué capacidades deben existir,
- cómo se activan,
- qué contexto reciben,
- qué reglas deben obedecer,
- qué herramientas pueden usar,
- cómo validamos resultados,
- cómo se conectan al producto,
- y qué observabilidad necesitamos para operarlos bien.

Los frameworks y los modelos nos dan piezas útiles.
Pero la **arquitectura del sistema agente** —el harness, los contratos, las rutas, los guardrails y la integración con el negocio— la estamos diseñando nosotros.

En otras palabras:

> El valor no está en “tener acceso a un modelo”.
> El valor está en **cómo lo convertimos en un sistema confiable, extensible y alineado al producto**.

---

## 8. Cómo manejamos los agentes hoy

Nuestro patrón actual es deliberadamente controlado:

### 1. El frontend no habla directamente con el modelo
El frontend dispara acciones de producto.

### 2. El backend decide el flujo
FastAPI recibe la solicitud, arma contexto, dependencias y permisos.

### 3. El agente corre dentro de una capa de aplicación
No dejamos que el modelo “descubra” el sistema por su cuenta.

### 4. La salida pasa por validación
Usamos esquemas y validación estructurada para aceptar o rechazar resultados.

### 5. Persistimos solo lo que tiene sentido de negocio
No tratamos cada salida del modelo como verdad absoluta.

### 6. Separación entre razonamiento y ejecución
La parte probabilística queda aislada; la parte crítica del producto sigue en código determinístico.

---

## 9. Cómo pensamos integrar tools, base de datos, MCPs y conexiones externas

La arquitectura está diseñada para crecer desde “agentes que responden” a “agentes que operan con herramientas”.

### 9.1 Tools

Las tools son capacidades explícitas que el agente puede invocar para actuar o consultar información.

Ejemplos futuros:

- cálculos de ingeniería,
- validaciones regulatorias,
- consulta de pricing,
- enriquecimiento con datos externos,
- generación de documentos,
- envío de acciones a CRM o marketplace.

La regla arquitectónica aquí es:

> **el agente no ejecuta lógica crítica por intuición; la delega a tools controladas**.

Eso mejora:

- consistencia,
- auditabilidad,
- seguridad,
- reutilización,
- y capacidad de testing.

### 9.2 Conexión a base de datos

No queremos que el modelo tenga acceso indiscriminado a la base de datos.

La intención es exponer acceso a datos mediante capas seguras:

- servicios de aplicación,
- queries acotadas,
- repositorios específicos,
- y permisos explícitos por operación.

El patrón correcto es:

```text
Agente
  → tool segura
    → servicio de aplicación
      → acceso controlado a datos
```

No:

```text
Agente
  → acceso libre a la BD
```

### 9.3 MCPs (Model Context Protocol)

Vemos los MCPs como una forma estándar de conectar a los agentes con sistemas externos y capacidades reutilizables.

Nos interesan porque permiten desacoplar:

- el agente,
- la fuente de datos,
- la herramienta,
- y el proveedor/modelo que esté ejecutando.

Bien usados, los MCPs nos ayudarían a integrar:

- fuentes documentales,
- sistemas internos,
- bases de conocimiento,
- herramientas operativas,
- conectores externos.

### 9.4 Integraciones externas

La visión es que el agente opere sobre una capa de adaptadores, no sobre APIs directas esparcidas por todo el sistema.

Ejemplos:

- CRM,
- marketplace,
- storage/documentos,
- proveedores de compliance,
- sistemas de comunicación,
- motores de búsqueda internos.

Esto permite cambiar proveedores sin rediseñar toda la capa de agentes.

---

## 10. Por qué esta arquitectura NO está encadenada a un modelo ni a un framework

Esta es una decisión intencional de arquitectura.

### No estamos encadenados a un modelo porque:

- el modelo se selecciona por configuración,
- los contratos del agente viven en nuestra aplicación,
- la validación vive fuera del modelo,
- las tools viven fuera del modelo,
- la lógica de negocio vive fuera del modelo,
- y podemos enrutar tareas a distintos proveedores.

### No estamos encadenados a un framework porque:

- el framework actual resuelve el runtime, no el producto,
- los prompts, contexto, reglas y outputs pertenecen al dominio,
- la orquestación puede abstraerse detrás de servicios internos,
- y las integraciones importantes no dependen de una API única de un vendor.

### Resultado

Podemos aprovechar:

- **lo mejor de los modelos**: calidad, costo, latencia, multimodalidad,
- **lo mejor de los frameworks**: tooling, ergonomía, velocidad de implementación,
- sin hipotecar la arquitectura del producto.

---

## 11. Beneficios prácticos para producto y negocio

### Flexibilidad
Podemos cambiar modelos según costo, calidad o velocidad.

### Menor riesgo técnico
No dependemos de una sola API, un solo proveedor o una sola moda del mercado.

### Escalabilidad funcional
Agregar nuevos agentes o nuevas tools no implica rehacer toda la plataforma.

### Mejor gobernanza
Podemos auditar mejor qué decidió el sistema, con qué contexto y mediante qué herramienta.

### Mayor confiabilidad
La IA no escribe directamente en el core del negocio sin pasar por guardrails.

---

## 12. Estado actual vs dirección objetivo

### Estado actual

- ya tenemos agentes backend operativos para tareas concretas,
- el runtime principal es PydanticAI,
- el proveedor principal actual es AWS Bedrock,
- ya existe uso especializado de OpenAI para transcripción,
- la validación estructurada ya es parte del patrón.

### Dirección objetivo

Queremos evolucionar hacia una plataforma de agentes con:

- routing más fino por capacidad,
- tools de dominio reutilizables,
- trazas y observabilidad más profundas,
- integración segura con datos y sistemas externos,
- soporte más explícito para MCPs/adaptadores,
- y una capa de orquestación todavía más desacoplada del vendor.

---

## 13. Frase corta para explicar esto a terceros

Si hay que resumirlo en una frase:

> **SecondStream no depende de un “bot” ni de un modelo en particular; estamos construyendo una capa propia de orquestación de inteligencia que puede usar distintos modelos, tools y proveedores sin perder control del producto.**

---

## 14. Takeaway final

Nuestro enfoque no es “pegarle prompts a una API”.

Nuestro enfoque es construir una **arquitectura de agentes modular, controlada y evolutiva**, donde:

- el modelo es reemplazable,
- el framework es reemplazable,
- las tools son extensibles,
- las integraciones son desacopladas,
- y el conocimiento operativo permanece en SecondStream.

Ese es el verdadero activo.
