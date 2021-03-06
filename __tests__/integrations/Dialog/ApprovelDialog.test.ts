/* eslint-disable dot-notation */
import supertest from "supertest";
import faker from "faker";
import app from "../../../src/app";

const request = supertest(app);

let authorization: string;
let dialogId: string;

beforeAll(async () => {
  const response = await request.post("/v1/register").send({
    name: faker.name.findName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
  });
  authorization = `Bearer ${response.body.metadata.token}`;
});

beforeEach(async () => {
  const dialog = await request
    .post("/v1/dialog")
    .set("Authorization", authorization)
    .send({ speech: faker.lorem.sentence(), answer: faker.lorem.sentence() });
  dialogId = dialog.body.data["_id"];
});

describe("Dialog consultation", () => {
  it("Check successful dialogue approval", async () => {
    const response = await request
      .put(`/v1/dialog/${dialogId}/approval`)
      .set("Authorization", authorization);

    const consult = await request.get("/v1/dialog").query({ _id: dialogId });

    expect(response.status).toBe(204);

    expect(consult.status).toBe(200);
    expect(consult.body.data[0].status).toBe("approved");
    expect(consult.body.data[0].approval_rate).toBe(100);
    expect(consult.body.data[0].approvals[0]).toBeTruthy();
  });

  it("Check approval of non-existent dialogue", async () => {
    dialogId = "5e1a0651741b255ddda996c4"; // This _id not exits

    const response = await request
      .put(`/v1/dialog/${dialogId}/approval`)
      .set("Authorization", authorization);

    expect(response.status).toBe(404);
    expect(response.body.error).toBeTruthy();
    expect(response.body.message).toBe("Resource not found");
  });

  it("Check behavior with the user already experienced in this dialog", async () => {
    await request
      .put(`/v1/dialog/${dialogId}/approval`)
      .set("Authorization", authorization);

    const response = await request
      .put(`/v1/dialog/${dialogId}/approval`)
      .set("Authorization", authorization);

    expect(response.status).toBe(409);
    expect(response.body.error).toBeTruthy();
    expect(response.body.entity).toBe("user");
    expect(response.body.message).toBe("User has already approved this dialog");
  });

  it("Verify that the pass rate is less than 70", async () => {
    const response = await request.post("/v1/register").send({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    });
    const newToken = `Bearer ${response.body.metadata.token}`;

    const responseApproval = await request
      .put(`/v1/dialog/${dialogId}/approval`)
      .set("Authorization", newToken);

    const responseDisapproval = await request
      .put(`/v1/dialog/${dialogId}/reject`)
      .set("Authorization", authorization);

    const consult = await request.get("/v1/dialog").query({ _id: dialogId });

    expect(responseApproval.status).toBe(204);
    expect(responseDisapproval.status).toBe(204);

    expect(consult.status).toBe(200);
    expect(consult.body.data[0].approval_rate).toBe(50);
    expect(consult.body.data[0].status).toBe("analyzing");
  });

  it("Verify removal of the user from the list of disapprovals", async () => {
    await request
      .put(`/v1/dialog/${dialogId}/reject`)
      .set("Authorization", authorization);

    await request
      .put(`/v1/dialog/${dialogId}/approval`)
      .set("Authorization", authorization);

    const consult = await request.get("/v1/dialog").query({ _id: dialogId });

    expect(consult.body.data[0].disapprovals).toEqual([]);
  });
});
