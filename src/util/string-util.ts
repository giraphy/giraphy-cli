export const capitalizeHead = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

export const snakeToCamel = (snake: string): string => snake.split("_").map((str, i) => i > 0 ? capitalizeHead(str) : str).join("");

