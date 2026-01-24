import { LETTER_DATA } from '../services/LetterRepository';

const NON_CONNECTING = ['ا', 'د', 'ذ', 'ر', 'ز', 'و'];
// Tashkeel to ignore (Fatha, Kasra, Damma, etc.)
const TASHKEEL = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

/**
 * Clean word by removing tashkeel and non-letters for path generation purposes.
 * (We keep the original word for display, but use cleaned for paths)
 */
const cleanWord = (word) => {
    return word.replace(TASHKEEL, '');
};

/**
 * Determine the form of the letter at index `i` in `word`.
 */
const getLetterForm = (word, i) => {
    const letters = word;
    const letter = letters[i];
    const prevChar = i > 0 ? letters[i - 1] : null;
    const nextChar = i < letters.length - 1 ? letters[i + 1] : null;

    // Check connectivity
    const prevConnects = prevChar && !NON_CONNECTING.includes(prevChar);
    const nextConnects = nextChar && !NON_CONNECTING.includes(letter); // Current letter must interpret if it connects forward

    if (!prevConnects && !nextConnects) return 'isolated';
    if (!prevConnects && nextConnects) return 'initial';
    if (prevConnects && nextConnects) return 'medial';
    if (prevConnects && !nextConnects) return 'final';
    return 'isolated';
};

/**
 * Generate normalized points for a word.
 * Returns an array of objects: { x, y, isNewStroke, letterIndex }.
 * 
 * Layout strategy:
 * - We lay out letters from Right to Left.
 * - Each letter has a width in LETTER_DATA.
 * - We accumulate X position.
 * - Y position is relative to baseline (approx 60).
 */
export const generateWordPath = (rawWord, canvasWidth, canvasHeight) => {
    const word = cleanWord(rawWord);
    const letters = word.split('');

    if (letters.length === 0) return [];

    // 1. Calculate total width to center the word
    let totalWidth = 0;
    const letterInfos = letters.map((char, i) => {
        const form = getLetterForm(word, i);
        const data = LETTER_DATA[char];
        if (!data) return null; // Skip unsupported

        const token = data[form];
        const info = {
            char,
            form,
            strokes: token.strokes,
            width: token.width
        };
        totalWidth += info.width;
        return info;
    }).filter(Boolean);

    if (letterInfos.length === 0) return [];

    // Add some spacing between disconnected letters? 
    // For simplicity, we just butt them together or add small padding.

    const scale = Math.min(canvasWidth / (totalWidth * 1.2), canvasHeight / 150); // 150 is approx max height

    // Center X, Y
    const startX = (canvasWidth + totalWidth * scale) / 2; // Start from Right
    const startY = (canvasHeight - 100 * scale) / 2; // Vertical center (assuming 100 height grids)

    let currentX = startX;
    const finalPoints = [];

    // Process from Right to Left
    letterInfos.forEach((info, index) => {
        // Current letter origin (top-right implied)
        // Our paths are 0-100. 
        // We need to shift X by info.width * scale AFTER drawing, because we draw RTL?
        // Wait, standard coordinates are Left-to-Right.
        // To draw RTL, we start at High X and decrease X.

        // Actually, our repository data 0,0 is top-left of the LETTER BOX.
        // If we want to stroke from Right to Left, we place the letter box at [currentX - width, currentX].

        const boxX = currentX - info.width * scale;
        const boxY = startY;

        // Process strokes
        info.strokes.forEach((stroke) => {
            stroke.forEach((point, pIndex) => {
                const [localX, localY] = point; // 0-100 range

                // Transform to canvas
                const finalX = boxX + (localX * scale);
                const finalY = boxY + (localY * scale);

                finalPoints.push({
                    x: finalX,
                    y: finalY,
                    isNewStroke: pIndex === 0,
                    letterIndex: index,
                    char: info.char
                });
            });
        });

        currentX -= info.width * scale;
    });

    return finalPoints;
};
