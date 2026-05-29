const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGIT_CHARS = '23456789';
const SYMBOL_CHARS = '!@#$%&*?';
const PASSWORD_CHARS = `${LOWERCASE_CHARS}${UPPERCASE_CHARS}${DIGIT_CHARS}${SYMBOL_CHARS}`;

function getRandomIndex(max) {
    const cryptoApi = typeof window !== 'undefined' ? window.crypto : null;

    if (cryptoApi?.getRandomValues) {
        const value = new Uint32Array(1);
        cryptoApi.getRandomValues(value);
        return value[0] % max;
    }

    return Math.floor(Math.random() * max);
}

function pickChar(chars) {
    return chars[getRandomIndex(chars.length)];
}

function shuffleChars(chars) {
    return chars
        .map((char) => ({ char, order: getRandomIndex(1000000) }))
        .sort((left, right) => left.order - right.order)
        .map((item) => item.char)
        .join('');
}

export function generateStrongPassword(length = 16) {
    const passwordLength = Math.max(12, length);
    const requiredChars = [
        pickChar(LOWERCASE_CHARS),
        pickChar(UPPERCASE_CHARS),
        pickChar(DIGIT_CHARS),
        pickChar(SYMBOL_CHARS),
    ];

    while (requiredChars.length < passwordLength) {
        requiredChars.push(pickChar(PASSWORD_CHARS));
    }

    return shuffleChars(requiredChars);
}
