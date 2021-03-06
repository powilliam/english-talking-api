import { Request, Response } from "express";

import RegisterUserService from "../services/RegisterUserService";
import AuthenticationUserService from "../services/AuthenticationUserService";

class SessionController {
  async register(req: Request, res: Response) {
    const response = await RegisterUserService(req, res);
    return response;
  }
  async authenticate(req: Request, res: Response) {
    const response = await AuthenticationUserService(req, res);
    return response;
  }
}

export default new SessionController();
