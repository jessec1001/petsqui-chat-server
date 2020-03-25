export default class SuccessResponse {
  success = true;
  message: string;
  data: {};

  constructor(message: string, data: {}) {
    this.message = message;
    this.data = data;
  }
}