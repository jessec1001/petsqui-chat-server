import { Router } from 'express';

export default interface ControllerInterface {
  getRouter(): Router;
}
