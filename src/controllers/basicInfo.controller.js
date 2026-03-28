import asyncHandler from "../utils/asyncHandler";
import {prisma} from "../db/index.js";

const departmentInfo = asyncHandler(async (req, res) => {
    const departments = await prisma.department.findMany({
        select:{
            id:true,
            code:true,
            name:true
        }   
})})

const buildingInfo = asyncHandler(async (req, res) => {
    const buildings = await prisma.building.findMany({
        select:{
            id:true,
            code:true,
            name:true
        }   
})})

