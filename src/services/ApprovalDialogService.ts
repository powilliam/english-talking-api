import { Request as ExpressRequest, Response } from "express";
import { Schema } from "mongoose";

import { ResponseHandler } from "../utils/ResponseHandler";
import Dialog from "../models/Dialog";

interface Request extends ExpressRequest {
  userId?: Schema.Types.ObjectId;
}

export default async function ApprovalDialogService(
  req: Request,
  res: Response
) {
  const response = new ResponseHandler(res);
  const { entities } = response;

  const { dialogId } = req.params;
  const { userId } = req;

  try {
    const dialogue = await Dialog.findById(dialogId);

    if (!dialogue)
      return response
        .isError()
        .entity(entities.DIALOG)
        .code(response.NOT_FOUND_404)
        .message("Resource not found")
        .send();

    const index = dialogue.disapprovals.indexOf(
      userId as Schema.Types.ObjectId
    );

    if (index > -1) dialogue.disapprovals.splice(index, 1);

    if (dialogue.approvals.includes(userId as Schema.Types.ObjectId))
      return response
        .isError()
        .entity(entities.USER)
        .code(response.CONFLICT_409)
        .message("User has already approved this dialog")
        .send();

    dialogue.approvals.push(userId as Schema.Types.ObjectId);

    if (dialogue.approval_rate >= 70) dialogue.status = "approved";

    await dialogue.save();

    return response
      .entity(entities.DIALOG)
      .code(response.NO_CONTENT_204)
      .send();
  } catch (error) {
    const isValidationError = error.name === "ValidationError";

    const code = isValidationError
      ? response.BAD_REQUEST_400
      : response.INTERNAL_SERVER_ERROR_500;

    const message = isValidationError
      ? error.message
      : "Dialog approvel failed";

    return response
      .isError()
      .entity(entities.DIALOG)
      .code(code)
      .message(message)
      .send();
  }
}
