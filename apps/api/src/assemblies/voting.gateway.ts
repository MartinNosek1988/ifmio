import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/voting' })
export class VotingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private assemblyRooms = new Map<string, Set<string>>()

  handleConnection(client: Socket) {
    const assemblyId = client.handshake.query.assemblyId as string
    if (assemblyId) {
      client.join(`assembly:${assemblyId}`)
      if (!this.assemblyRooms.has(assemblyId)) this.assemblyRooms.set(assemblyId, new Set())
      this.assemblyRooms.get(assemblyId)!.add(client.id)
    }
  }

  handleDisconnect(client: Socket) {
    this.assemblyRooms.forEach((clients) => clients.delete(client.id))
  }

  broadcastVote(assemblyId: string, data: {
    keypadId: string; attendeeName: string; choice: string
    shareWeight: number; agendaItemId: string; timestamp: Date
  }) {
    this.server.to(`assembly:${assemblyId}`).emit('vote:received', data)
  }

  broadcastVotingState(assemblyId: string, data: {
    agendaItemId: string; votingOpen: boolean; itemTitle: string
  }) {
    this.server.to(`assembly:${assemblyId}`).emit('voting:state', data)
  }

  broadcastQuorum(assemblyId: string, data: {
    presentShares: number; totalShares: number; quorumPercentage: number; isQuorate: boolean
  }) {
    this.server.to(`assembly:${assemblyId}`).emit('quorum:update', data)
  }

  broadcastTally(assemblyId: string, data: {
    agendaItemId: string; votesFor: number; votesAgainst: number; votesAbstain: number
    totalVoted: number; totalEligible: number
  }) {
    this.server.to(`assembly:${assemblyId}`).emit('tally:update', data)
  }

  broadcastResult(assemblyId: string, data: {
    agendaItemId: string; result: string
    votesFor: number; votesAgainst: number; votesAbstain: number
  }) {
    this.server.to(`assembly:${assemblyId}`).emit('voting:result', data)
  }

  broadcastPendingKeypads(assemblyId: string, data: {
    agendaItemId: string
    pending: Array<{ keypadId: string; attendeeName: string; share: number }>
    totalKeypads: number; votedKeypads: number
  }) {
    this.server.to(`assembly:${assemblyId}`).emit('voting:pending', data)
  }

  getConnectedCount(assemblyId: string): number {
    return this.assemblyRooms.get(assemblyId)?.size ?? 0
  }
}
