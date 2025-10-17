
export const generateRandomPos = (boundX: number, boundY: number) => {
    return {
        x: Math.random() * boundX,
        y: Math.random() * boundY,
    };
};


export const getRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r}, ${g}, ${b})`;
}