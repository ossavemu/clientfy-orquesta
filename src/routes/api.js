import express from "express";
import createRoute from "./instance/create.js";
import deleteRoute from "./instance/delete.js";
import listRoute from "./instance/list.js";
import restartRoute from "./instance/restart.js";
import statusRoute from "./instance/status.js";

const router = express.Router();

router.use("/instance", createRoute);
router.use("/instance", statusRoute);
router.use("/instance", restartRoute);
router.use("/instance", deleteRoute);
router.use("/instance", listRoute);

export default router;
