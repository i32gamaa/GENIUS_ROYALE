// --- Lógica del juego ---

// Variables globales
let preguntas = [];
let preguntaActual = 0;
let puntaje = 0;
let temporizador = null;

// Función para inicializar el juego
function inicializarJuego() {
    console.log("Iniciando el juego...");
    puntaje = 0;
    preguntaActual = 0;
    preguntas = generarPreguntas();
    mostrarPregunta();
}

// Función para generar preguntas simuladas
function generarPreguntas() {
    const preguntasFaciles = [
        { categoria: "fácil", pregunta: "¿Cuál es el color del cielo?", opciones: ["Azul", "Rojo", "Verde", "Amarillo"], respuesta: 0 },
        { categoria: "fácil", pregunta: "¿Cuánto es 2 + 2?", opciones: ["3", "4", "5", "6"], respuesta: 1 },
        { categoria: "fácil", pregunta: "¿Qué animal hace 'miau'?", opciones: ["Perro", "Gato", "Pájaro", "Pez"], respuesta: 1 },
        // Agrega más preguntas fáciles
    ];

    const preguntasMedias = [
        { categoria: "medio", pregunta: "¿Cuál es el país más grande del mundo?", opciones: ["China", "Rusia", "Canadá", "EE.UU."], respuesta: 1 },
        { categoria: "medio", pregunta: "¿Qué planeta es conocido como el planeta rojo?", opciones: ["Marte", "Júpiter", "Saturno", "Venus"], respuesta: 0 },
        { categoria: "medio", pregunta: "¿Quién pintó la Mona Lisa?", opciones: ["Van Gogh", "Picasso", "Da Vinci", "Rembrandt"], respuesta: 2 },
        // Agrega más preguntas medias
    ];

    const preguntasDificiles = [
        { categoria: "difícil", pregunta: "¿Cuál es el elemento químico con el símbolo 'Hg'?", opciones: ["Hidrógeno", "Mercurio", "Helio", "Magnesio"], respuesta: 1 },
        { categoria: "difícil", pregunta: "¿En qué año llegó el hombre a la Luna?", opciones: ["1969", "1972", "1958", "1965"], respuesta: 0 },
        { categoria: "difícil", pregunta: "¿Quién escribió 'Cien años de soledad'?", opciones: ["Gabriel García Márquez", "Pablo Neruda", "Mario Vargas Llosa", "Isabel Allende"], respuesta: 0 },
        // Agrega más preguntas difíciles
    ];

    // Mezclar y seleccionar 5 preguntas de cada categoría
    return [
        ...mezclarArray(preguntasFaciles).slice(0, 5),
        ...mezclarArray(preguntasMedias).slice(0, 5),
        ...mezclarArray(preguntasDificiles).slice(0, 5)
    ];
}

// Función para mostrar una pregunta
function mostrarPregunta() {
    if (preguntaActual >= preguntas.length) {
        finalizarJuego();
        return;
    }

    const pregunta = preguntas[preguntaActual];
    const preguntaElemento = document.querySelector('.question');
    const opcionesElemento = document.querySelector('.options');

    // Mostrar la pregunta
    preguntaElemento.textContent = pregunta.pregunta;

    // Limpiar opciones anteriores
    opcionesElemento.innerHTML = '';

    // Mostrar opciones
    pregunta.opciones.forEach((opcion, index) => {
        const boton = document.createElement('button');
        boton.textContent = opcion;
        boton.classList.add('option-button');
        boton.addEventListener('click', () => verificarRespuesta(index));
        opcionesElemento.appendChild(boton);
    });

    // Iniciar temporizador
    iniciarTemporizador();
}

// Función para verificar la respuesta
function verificarRespuesta(indice) {
    const pregunta = preguntas[preguntaActual];
    if (indice === pregunta.respuesta) {
        puntaje++;
        console.log("✅ Respuesta correcta!");
    } else {
        console.log("❌ Respuesta incorrecta.");
    }

    // Pasar a la siguiente pregunta
    preguntaActual++;
    mostrarPregunta();
}

// Función para iniciar el temporizador
function iniciarTemporizador() {
    const timerElemento = document.querySelector('.timer');
    let tiempoRestante = 15; // 15 segundos por pregunta

    // Limpiar temporizador anterior
    if (temporizador) clearInterval(temporizador);

    temporizador = setInterval(() => {
        if (tiempoRestante <= 0) {
            clearInterval(temporizador);
            console.log("⏰ Tiempo agotado!");
            preguntaActual++;
            mostrarPregunta();
        } else {
            timerElemento.textContent = `Tiempo restante: ${tiempoRestante} segundos`;
            tiempoRestante--;
        }
    }, 1000);
}

// Función para finalizar el juego
function finalizarJuego() {
    console.log("🎉 Juego terminado! Puntaje final: " + puntaje);
    alert(`Juego terminado! Tu puntaje final es: ${puntaje}/${preguntas.length}`);
    cambiarPantalla(screenGame, screenMenu); // Regresar al menú principal
}

// Función para mezclar un array
function mezclarArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// Exportar la función para inicializar el juego
export { inicializarJuego };