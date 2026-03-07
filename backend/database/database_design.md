# Diseño de Base de Datos – Genius Royale

## Descripción general

La base de datos almacena toda la información necesaria para el funcionamiento del juego **Genius Royale**, incluyendo usuarios, partidas, preguntas, categorías, comodines y estadísticas de los jugadores.

## Entidades principales

- Usuario
- Pregunta
- Categoria
- Partida
- Jugador_Partida
- Estadisticas
- Amistad
- Comodin
- Comodin_Usado

## Descripción de las entidades

### Usuario
Almacena la información de los jugadores registrados en la aplicación, como su nombre, correo electrónico, contraseña, nivel y puntos acumulados.

### Pregunta
Contiene las preguntas que se utilizan durante las partidas del juego, incluyendo sus posibles respuestas y la dificultad.

### Categoria
Permite clasificar las preguntas según su temática, por ejemplo fútbol, videojuegos o cultura general.

### Partida
Representa una partida del juego en la que participan uno o varios jugadores.

### Jugador_Partida
Relaciona los jugadores con las partidas en las que participan y almacena información relevante como los puntos obtenidos o el estado del jugador en la partida.

### Estadisticas
Guarda estadísticas globales de cada jugador, como número de partidas jugadas, partidas ganadas o número de respuestas correctas e incorrectas.

### Amistad
Representa las relaciones de amistad entre los usuarios del sistema, permitiendo añadir amigos y jugar partidas privadas.

### Comodin
Almacena los distintos comodines disponibles en el juego, como el 50:50 o cambiar de pregunta.

### Comodin_Usado
Registra cuándo un jugador utiliza un comodín durante una partida.

## Relaciones entre entidades

Las entidades del sistema se relacionan entre sí de la siguiente manera:

- Un **usuario** puede participar en múltiples **partidas**. Esta relación se gestiona mediante la tabla `Jugador_Partida`.

- Una **partida** puede tener varios **jugadores**, y cada jugador puede participar en diferentes partidas.

- Cada **pregunta** pertenece a una única **categoría**, lo que permite organizar las preguntas por temática.

- Cada **usuario** tiene asociadas unas **estadísticas**, donde se almacenan datos como el número de partidas jugadas o respuestas correctas.

- Los **usuarios** pueden establecer relaciones de amistad entre sí, las cuales se almacenan en la tabla `Amistad`.

- Durante las partidas los jugadores pueden utilizar **comodines**, cuyo uso queda registrado en la tabla `Comodin_Usado`.
## Diagrama de la base de datos

![Diagrama de la base de datos](database_diagram.png)
