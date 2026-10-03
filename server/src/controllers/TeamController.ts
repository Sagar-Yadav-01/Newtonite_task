import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/TeamService';
import { createTeamSchema, updateTeamSchema, addTeamMemberSchema } from '../validators';
import { requireAdmin, requireTeamMemberOrAdmin } from '../middleware/authorize';

export class TeamController {
  public static async createTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createTeamSchema.parse(req.body);
      const team = await TeamService.createTeam(validated, req.user!.id);
      res.status(201).json(team);
    } catch (err) {
      next(err);
    }
  }

  public static async getAllTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const teams = await TeamService.getAllTeams();
      res.status(200).json(teams);
    } catch (err) {
      next(err);
    }
  }

  public static async getTeamById(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      await requireTeamMemberOrAdmin(req.user!, teamId);
      const team = await TeamService.getTeamById(teamId);
      res.status(200).json(team);
    } catch (err) {
      next(err);
    }
  }

  public static async updateTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      await requireAdmin(req.user!);
      const validated = updateTeamSchema.parse(req.body);
      const team = await TeamService.updateTeam(teamId, validated);
      res.status(200).json(team);
    } catch (err) {
      next(err);
    }
  }

  public static async getTeamMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      await requireTeamMemberOrAdmin(req.user!, teamId);
      const members = await TeamService.getTeamMembers(teamId);
      res.status(200).json(members);
    } catch (err) {
      next(err);
    }
  }

  public static async addTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      await requireAdmin(req.user!);
      const validated = addTeamMemberSchema.parse(req.body);
      const member = await TeamService.addMember(teamId, validated.userId, validated.role);
      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  }

  public static async removeTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      await requireAdmin(req.user!);
      const result = await TeamService.removeMember(teamId, req.params.userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
