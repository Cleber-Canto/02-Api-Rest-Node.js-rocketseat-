import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {
  // Rota para obter todas as transações
  app.get(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sessionId } = request.cookies
        const transactions = await knex('transactions')
          .where('transactions.session_id', sessionId)
          .select('*')

        reply.code(200).send({ transactions })
      } catch (error) {
        reply.code(500).send({ error: 'Internal Server Error' })
      }
    },
  )

  // Rota para obter uma transação pelo ID
  app.get(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const getTransactionsParamsSchema = z.object({
          id: z.string().uuid(),
        })

        const { id } = getTransactionsParamsSchema.parse(request.params)
        const { sessionId } = request.cookies

        const transaction = await knex('transactions')
          .where({
            id,
            session_id: sessionId,
          })
          .select('*') // Adicionando a seleção do campo description
          .first()

        if (!transaction) {
          reply.code(404).send({ message: 'Transaction not found' })
        } else {
          reply.code(200).send({ transaction })
        }
      } catch (error) {
        reply.code(500).send({ error: 'Internal Server Error' })
      }
    },
  )

  // Rota para obter o resumo das transações
  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { sessionId } = request.cookies
        console.log('Session ID:', sessionId) // Adicionando console.log para verificar o valor de sessionId
        const summary = await knex('transactions')
          .where('session_id', sessionId)
          .sum('amount', { as: 'amount' })
          .first()

        console.log('Summary:', summary) // Adicionando console.log para verificar o valor de summary

        reply.code(200).send({ summary })
      } catch (error) {
        console.error('Error:', error) // Adicionando console.log para imprimir o erro no terminal
        reply.code(500).send({ error: 'Internal Server Error' })
      }
    },
  )

  // Rota para criar uma nova transação
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const createTransactionBodySchema = z.object({
        title: z.string(),
        amount: z.number(),
        type: z.enum(['credit', 'debit']),
      })

      const { title, amount, type } = createTransactionBodySchema.parse(
        request.body,
      )

      let sessionId = request.cookies.sessionId

      if (!sessionId) {
        sessionId = randomUUID()
        reply.setCookie('sessionId', sessionId, {
          path: '/',
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        })
      }

      await knex('transactions').insert({
        id: randomUUID(),
        title,
        amount: type === 'credit' ? amount : amount * -1,
        session_id: sessionId,
      })

      reply.code(201).send({ message: 'Transaction created successfully' })
    } catch (error) {
      reply.code(500).send({ error: 'Internal Server Error' })
    }
  })

  // Rota para atualizar uma transação pelo ID
  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const getTransactionsParamsSchema = z.object({
          id: z.string().uuid(),
        })

        const { id } = getTransactionsParamsSchema.parse(request.params)
        const { sessionId } = request.cookies

        const transaction = await knex('transactions')
          .where({
            id,
            session_id: sessionId,
          })
          .first()

        if (!transaction) {
          reply.code(404).send({ message: 'Transaction not found' })
        } else {
          const updateTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit']),
          })

          const { title, amount, type } = updateTransactionBodySchema.parse(
            request.body,
          )

          await knex('transactions')
            .where({
              id,
              session_id: sessionId,
            })
            .update({
              title,
              amount: type === 'credit' ? amount : amount * -1,
            })

          reply.code(200).send({ message: 'Transaction updated successfully' })
        }
      } catch (error) {
        console.error(error) // Adicionando console.log aqui
        reply.code(500).send({ error: 'Internal Server Error' })
      }
    },
  )

  // Rota para excluir uma transação pelo ID
  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const getTransactionsParamsSchema = z.object({
          id: z.string().uuid(),
        })

        const { id } = getTransactionsParamsSchema.parse(request.params)
        const { sessionId } = request.cookies

        const transaction = await knex('transactions')
          .where({
            id,
            session_id: sessionId,
          })
          .first()

        if (!transaction) {
          reply.code(404).send({ message: 'Transaction not found' })
        } else {
          await knex('transactions')
            .where({
              id,
              session_id: sessionId,
            })
            .del()

          reply.code(200).send({ message: 'Transaction deleted successfully' })
        }
      } catch (error) {
        reply.code(500).send({ error: 'Internal Server Error' })
      }
    },
  )
}
