// tests/agents/grievanceAgent.test.js
const { generateTicketId, classifyGrievance,
        handleGrievance } = require('../../server/agents/grievanceAgent');

describe('Grievance Agent', () => {

  describe('Ticket ID generation', () => {
    test('matches format GRV-YYYYMMDD-XXXXX', () => {
      const id = generateTicketId();
      expect(id).toMatch(/^GRV-\d{8}-[A-Z0-9]{5}$/);
    });

    test('generates unique IDs on repeated calls', () => {
      const ids = new Set(Array.from({ length: 100 }, generateTicketId));
      expect(ids.size).toBe(100);
    });
  });

  describe('Category classification', () => {
    test('classifies booth complaint correctly', () => {
      expect(classifyGrievance('my booth is closed')).toBe('booth');
    });
    test('classifies roll complaint correctly', () => {
      expect(classifyGrievance('my name is missing from the roll')).toBe('roll');
    });
    test('classifies accessibility complaint correctly', () => {
      expect(classifyGrievance('there is no wheelchair ramp at my booth')).toBe('accessibility');
    });
    test('defaults to other for unclassified complaint', () => {
      expect(classifyGrievance('something is wrong')).toBe('other');
    });
  });

  describe('Accessibility fast-path', () => {
    test('escalates accessibility complaint with HIGH urgency', async () => {
      const result = await handleGrievance({
        message: 'my booth has no wheelchair access',
        category: 'accessibility'
      });
      expect(result.urgency).toBe('high');
      expect(result.escalated).toBe(true);
      expect(result.ticket_id).toMatch(/^GRV-/);
    });
  });

});
