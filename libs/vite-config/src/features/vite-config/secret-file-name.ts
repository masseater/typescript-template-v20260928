const secretFileName = /^(?:\.env.*|\.dev\.vars.*|.*\.(?:pem|key))$/u;

const isSecretFileName = (fileName: string): boolean => secretFileName.test(fileName);

export { isSecretFileName };
