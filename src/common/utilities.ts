import child_process from 'child_process';

export function validateUrl(input: string): boolean | string {
  return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/.test(
    input
  )
    ? true
    : "You must provide a valid URL.";
}

export function validateEmail(input: string): boolean | string {
  // tslint:disable-next-line:max-line-length
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    input
  )
    ? true
    : "You must provide a valid email.";
}

export function validateNamespace(input: string): boolean | string {
  return /^[ a-zA-Z]+$/.test(input)
    ? true
    : `Answer must not contain spaces, numeric characters or special characters.`;
}

export function validateGuid(input: string): boolean | string {
  return /^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/i.test(input)
    ? true
    : `Your answer doesn't match the shape of a GUID.`;
}

export function validatePacAuthProfile(input: string): boolean | string {
  const subprocess = child_process.spawnSync("pac auth list", [], { stdio: 'pipe', shell: true });

  if (subprocess.error) {
    return "Failed to validate. Do you have PAC installed?"
  }

  const output = subprocess.stdout.toString();

  return output.match(new RegExp(`\\s(${input})\\s`, 'g'))
    ? true
    : "PAC Auth profile not found.";
}
