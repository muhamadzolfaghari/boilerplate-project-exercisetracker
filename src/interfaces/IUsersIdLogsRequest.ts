import { Request } from "express";
import ILog from "./ILog";
import IUser from "./IUser";
import IErrorBody from "./IErrorBody";

interface IQuery {
  to?: string;
  from?: string;
  limit?: string;
}

interface IParams {
  _id: string;
}

interface IBody extends ILog, IUser {}

export default interface IUsersIdLogsRequest
  extends Request<IParams, IBody | IErrorBody, never, IQuery> {}