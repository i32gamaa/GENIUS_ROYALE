CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP,
    avatar VARCHAR(255),
    nivel INTEGER,
    puntos_totales INTEGER
);

CREATE TABLE Estadisticas (
    id_estadistica SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE,
    partidas_jugadas INTEGER,
    partidas_ganadas INTEGER,
    respuestas_correctas INTEGER,
    respuestas_incorrectas INTEGER,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255)
);

CREATE TABLE Pregunta (
    id_pregunta SERIAL PRIMARY KEY,
    texto_pregunta TEXT NOT NULL,
    respuesta_correcta VARCHAR(255) NOT NULL,
    respuesta2 VARCHAR(255),
    respuesta3 VARCHAR(255),
    respuesta4 VARCHAR(255),
    dificultad VARCHAR(50),
    id_categoria INTEGER,
    FOREIGN KEY (id_categoria) REFERENCES Categoria(id_categoria)
);

CREATE TABLE Partida (
    id_partida SERIAL PRIMARY KEY,
    modo VARCHAR(50),
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    estado VARCHAR(50)
);

CREATE TABLE Jugador_Partida (
    id SERIAL PRIMARY KEY,
    id_partida INTEGER,
    id_usuario INTEGER,
    puntos INTEGER,
    estado VARCHAR(50),
    FOREIGN KEY (id_partida) REFERENCES Partida(id_partida),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Amistad (
    id_amistad SERIAL PRIMARY KEY,
    id_usuario1 INTEGER,
    id_usuario2 INTEGER,
    estado VARCHAR(50),
    fecha TIMESTAMP,
    FOREIGN KEY (id_usuario1) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_usuario2) REFERENCES Usuario(id_usuario)
);

CREATE TABLE Comodin (
    id_comodin SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    descripcion VARCHAR(255)
);

CREATE TABLE Comodin_Usado (
    id SERIAL PRIMARY KEY,
    id_partida INTEGER,
    id_usuario INTEGER,
    id_comodin INTEGER,
    fecha_uso TIMESTAMP,
    FOREIGN KEY (id_partida) REFERENCES Partida(id_partida),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_comodin) REFERENCES Comodin(id_comodin)
);
