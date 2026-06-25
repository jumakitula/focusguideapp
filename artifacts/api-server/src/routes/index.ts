import { Router, type IRouter } from "express";
import healthRouter from "./health";
import focusRouter from "./focus";
import settingsRouter from "./settings";
import calendarRouter from "./calendar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(focusRouter);
router.use(settingsRouter);
router.use(calendarRouter);

export default router;
