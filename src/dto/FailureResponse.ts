export default class FailureResponse {
  success = false;
  message: string;
  errors: string[];

  constructor(message: string, errors: string[]) {
    this.errors = errors;
  }
}