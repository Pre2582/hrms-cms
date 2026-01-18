import express from 'express';
import {
  getAllEmployees,
  getEmployee,
  createEmployee,
  deleteEmployee
} from '../controllers/employeeController.js';

const router = express.Router();

router.route('/')
  .get(getAllEmployees)
  .post(createEmployee);

router.route('/:id')
  .get(getEmployee)
  .delete(deleteEmployee);

export default router;
