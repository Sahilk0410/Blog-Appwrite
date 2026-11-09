import conf from "../conf/conf.js"
import { Client, Account, ID } from "appwrite"


export class AuthService {
    client = new Client()
    account

    constructor() {
        this.client
            .setEndpoint(conf.appwriteUrl)
            .setProject(conf.appwriteProjectId)

        this.account = new Account(this.client)
    }


    // CREATE ACCOUNT
    async createAccount({ email, password, name }) {
        try {
            const userAccount = await this.account.create({
                userId: ID.unique(),
                email,
                password,
                name
            })

            if (userAccount) {
                // Login after successful registration
                return this.login({ email, password })
            }

            return userAccount

        } catch (error) {
            throw error
        }
    }


    // LOGIN
    async login({ email, password }) {
        try {
            return await this.account.createEmailPasswordSession({
                email,
                password
            })

        } catch (error) {
            throw error
        }
    }


    // GET CURRENT USER
    async getCurrentUser() {
        try {
            return await this.account.get()

        } catch (error) {
            console.log("Appwrite service :: getCurrentUser :: error", error)
        }

        return null
    }


    // LOGOUT
    async logout() {
        try {
            await this.account.deleteSessions()

        } catch (error) {
            console.log("Appwrite service :: logout :: error", error)
        }
    }
}


const authService = new AuthService()

export default authService
