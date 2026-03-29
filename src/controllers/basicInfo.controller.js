import asyncHandler from "../utils/asyncHandler";
import {prisma} from "../db/index.js";
import ApiResponse  from "../utils/apiResponse.js"
const departmentInfo = asyncHandler(async (req, res) => {
    const departments = await prisma.department.findMany({
        select:{
            id:true,
            code:true,
            name:true
        }   
    })
    return new ApiResponse(200, "Departments fetched successfully", departments)
})

const buildingInfo = asyncHandler(async (req, res) => {
    const buildings = await prisma.building.findMany({
        select:{
            id:true,
            code:true,
            name:true
        }   
    })
    return new ApiResponse(200, "Buildings fetched successfully", buildings)
})
