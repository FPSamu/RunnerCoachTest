# Runner Coach: Tu Entrenador Personal de Running con Inteligencia Artificial

## Descripción General
**Runner Coach** es una skill interactiva de Alexa diseñada para revolucionar la forma en que te preparas física y mentalmente para correr. Al combinar la conveniencia de los comandos de voz de Alexa con el poder analítico de la inteligencia artificial (Gemini AI), la skill actúa como un entrenador personal que vive en tu altavoz inteligente o aplicación de Alexa.

Ya sea que estés buscando levantarte del sofá para correr tus primeros 5 kilómetros, o seas un atleta avanzado preparándose para un maratón, Runner Coach crea, adapta y da seguimiento a tu plan de entrenamiento semanal de forma completamente personalizada.

---

## Características Principales

### 1. Onboarding Conversacional e Inteligente
Olvídate de los formularios aburridos. Al usar la skill por primera vez, Runner Coach tendrá una conversación natural contigo para conocerte. Utiliza Inteligencia Artificial para extraer automáticamente la siguiente información de tu respuesta hablada:
- **Nombre:** Para saludarte de forma personalizada en cada sesión.
- **Nivel de Experiencia:** Principiante, Intermedio o Avanzado.
- **Meta Inicial:** ¿Quieres correr 5k, 10k, un medio maratón, o solo mejorar tu condición física?
- **Frecuencia:** ¿Cuántos días a la semana estás dispuesto a entrenar?

### 2. Generación de Planes Semanales con IA
A diferencia de los planes estáticos descargados de internet, Runner Coach utiliza un motor de Inteligencia Artificial (Google Gemini) para generar una semana entera de entrenamientos únicos. El modelo analiza tu nivel, tu meta y, lo más importante, **tus métricas de las semanas pasadas**, asegurando que el progreso sea gradual, seguro y adaptado a tus capacidades reales.

### 3. Rutina Diaria (Consultar Entrenamientos)
Cada vez que abres la skill y preguntas *"¿Qué me toca correr hoy?"*, Runner Coach revisa tu plan semanal y te entrega el entrenamiento del día. Te indicará exactamente qué hacer: desde intervalos de velocidad, trotes de recuperación, hasta distancias largas ("long runs"), incluyendo tiempos de calentamiento.

### 4. Registro de Sesiones y "Feedback" Biométrico
El entrenamiento no termina cuando dejas de sudar. Cuando terminas de correr, puedes decirle a Alexa *"Ya terminé de correr"*. La skill te preguntará dos datos cruciales:
- **Duración:** Cuánto tiempo estuviste corriendo.
- **Esfuerzo Percibido:** Una calificación de qué tan pesada sentiste la sesión.

Esta información se guarda en tu bitácora personal (MongoDB) y es consumida por la Inteligencia Artificial a la hora de diseñar tu *siguiente* semana. Si la IA detecta que tus esfuerzos percibidos son muy altos, reducirá la intensidad de la próxima semana para evitar lesiones.

### 5. Flexibilidad y Ajuste de Metas
Las personas cambian y las metas también. Si te das cuenta de que el plan actual es muy fácil o muy difícil, en cualquier momento puedes invocar a tu coach y decirle:
- *"Cambiar mi nivel a avanzado"*
- *"Mi nueva meta es correr un Maratón"*
- *"Quiero entrenar 5 días a la semana"*

Runner Coach actualizará tu perfil y reestructurará tus entrenamientos futuros basándose en esta nueva información.

---

## Flujo de Uso Típico (Ejemplo)

**Usuario:** *"Alexa, abre Runner Coach"*
**Alexa:** *"¡Hola de nuevo, Carlos! ¿Qué quieres hacer?"*
**Usuario:** *"¿Qué me toca correr hoy?"*
**Alexa:** *"Hoy te toca un entrenamiento de intervalos. Haz 10 minutos de trote suave para calentar, seguido de 6 repeticiones de 400 metros a paso rápido con 1 minuto de descanso entre cada una. Termina con 5 minutos de caminata."*

*(El usuario sale a correr y regresa)*

**Usuario:** *"Alexa, dile a Runner Coach que ya terminé mi entrenamiento"*
**Alexa:** *"¡Excelente trabajo, Carlos! ¿Cuánto tiempo corriste hoy?"*
**Usuario:** *"45 minutos"*
**Alexa:** *"Registrado. Y del 1 al 10, ¿qué tanto esfuerzo te requirió la sesión de hoy?"*
**Usuario:** *"Un 8"*
**Alexa:** *"Entendido, he guardado tu sesión de 45 minutos con esfuerzo 8. ¡Descansa y nos vemos en el próximo entrenamiento!"*

---

## Beneficios para el Usuario
- **Sin pantallas:** Ideal para cuando te estás cambiando los tenis o tomando agua, puedes organizar y registrar tu entrenamiento usando solo tu voz.
- **Planes Dinámicos:** La hiper-personalización asegura que no te aburras ni te sobreentrenes.
- **Responsabilidad:** Tener un registro vocal de tu entrenamiento genera un mayor compromiso psicológico con tus metas deportivas.
