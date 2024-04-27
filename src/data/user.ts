import { db } from "@/src/lib/db";
import { UserRole } from "@prisma/client";

export const getUserByPhoneNumber = async (phoneNumber: string) => {
    try {
        const user = await db.user.findUnique({
            where: { phoneNumber }
        })

        return user;
    } catch {
        return null;
    }
}



export const getUserById = async (id: string) => {
    try {
        const user = await db.user.findUnique({
            where: { id }
        })

        return user;
    } catch {
        return null;
    }
}
export const getUserByIdReqInfo = async (id: string) => {
    try {
        const user = await db.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                organization: true,
                isVerified: true,
            },
        })

        return user;
    } catch {
        return null;
    }
}


export interface UserQuery {
    role?: UserRole[];
    organization?: string | { not: string };
}

export const getAllUsersWithRole = async (query?: UserQuery) => {
    try {
        const whereClause: any = {
            role: query?.role ? { in: query.role } : undefined,
            organization: query?.organization || undefined,
        };

        const users = await db.user.findMany({
            where: whereClause,
        });
        
        return users;
    } catch (error) {
        console.error('Error fetching users with role:', error);
        return null;
    }
};