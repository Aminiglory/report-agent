import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import SchoolList from '../models/SchoolList.js';

const router = express.Router();

// Get all school lists for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const lists = await SchoolList.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    
    const transformed = lists.map(list => ({
      ...list,
      id: list._id.toString(),
      schools: list.schools.sort((a, b) => a.order - b.order)
    }));
    
    res.json({ schoolLists: transformed });
  } catch (error) {
    console.error('Error fetching school lists:', error);
    res.status(500).json({ error: 'Error fetching school lists' });
  }
});

// Get single school list
router.get('/:listId', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.userId;
    
    const list = await SchoolList.findOne({ _id: listId, user: userId }).lean();
    if (!list) {
      return res.status(404).json({ error: 'School list not found' });
    }
    
    list.schools.sort((a, b) => a.order - b.order);
    res.json({ schoolList: { ...list, id: list._id.toString() } });
  } catch (error) {
    console.error('Error fetching school list:', error);
    res.status(500).json({ error: 'Error fetching school list' });
  }
});

// Create new school list
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, schools } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!schools || !Array.isArray(schools) || schools.length === 0) {
      return res.status(400).json({ error: 'At least one school is required' });
    }
    
    // Process schools with order
    const processedSchools = schools.map((school, index) => {
      const schoolObj = {
        school_name: school.school_name || school,
        order: school.order !== undefined ? school.order : index + 1,
        head_teacher: school.head_teacher || {
          name: '',
          title: 'Head Teacher',
          telephone: ''
        }
      };
      // Only include status if it's provided and valid
      if (school.status && ['Primary', 'Secondary', 'TVET'].includes(school.status)) {
        schoolObj.status = school.status;
      }
      return schoolObj;
    });
    
    const schoolList = new SchoolList({
      user: userId,
      name,
      description: description || '',
      schools: processedSchools
    });
    
    await schoolList.save();
    
    res.status(201).json({
      message: 'School list created successfully',
      schoolList: { ...schoolList.toObject(), id: schoolList._id.toString() }
    });
  } catch (error) {
    console.error('Error creating school list:', error);
    res.status(500).json({ error: 'Error creating school list: ' + error.message });
  }
});

// Update school list
router.put('/:listId', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.userId;
    const { name, description, schools, is_active } = req.body;
    
    const schoolList = await SchoolList.findOne({ _id: listId, user: userId });
    if (!schoolList) {
      return res.status(404).json({ error: 'School list not found' });
    }
    
    if (name) schoolList.name = name;
    if (description !== undefined) schoolList.description = description;
    if (is_active !== undefined) schoolList.is_active = is_active;
    
    if (schools && Array.isArray(schools)) {
      const processedSchools = schools.map((school, index) => {
        const schoolObj = {
          school_name: school.school_name || school,
          order: school.order !== undefined ? school.order : index + 1,
          head_teacher: school.head_teacher || {
            name: schoolList.schools.find(s => s.school_name === (school.school_name || school))?.head_teacher?.name || '',
            title: 'Head Teacher',
            telephone: schoolList.schools.find(s => s.school_name === (school.school_name || school))?.head_teacher?.telephone || ''
          }
        };
        // Only include status if it's provided and valid
        if (school.status && ['Primary', 'Secondary', 'TVET'].includes(school.status)) {
          schoolObj.status = school.status;
        }
        return schoolObj;
      });
      schoolList.schools = processedSchools;
    }
    
    await schoolList.save();
    
    res.json({
      message: 'School list updated successfully',
      schoolList: { ...schoolList.toObject(), id: schoolList._id.toString() }
    });
  } catch (error) {
    console.error('Error updating school list:', error);
    res.status(500).json({ error: 'Error updating school list' });
  }
});

// Update head teacher for a school in a list
router.put('/:listId/schools/:schoolName/head-teacher', authenticateToken, async (req, res) => {
  try {
    const { listId, schoolName } = req.params;
    const userId = req.user.userId;
    const { name, title, telephone } = req.body;
    
    const schoolList = await SchoolList.findOne({ _id: listId, user: userId });
    if (!schoolList) {
      return res.status(404).json({ error: 'School list not found' });
    }
    
    const school = schoolList.schools.find(s => s.school_name === decodeURIComponent(schoolName));
    if (!school) {
      return res.status(404).json({ error: 'School not found in list' });
    }
    
    school.head_teacher = {
      name: name || '',
      title: title || 'Head Teacher',
      telephone: telephone || ''
    };
    
    await schoolList.save();
    
    res.json({
      message: 'Head teacher updated successfully',
      schoolList: { ...schoolList.toObject(), id: schoolList._id.toString() }
    });
  } catch (error) {
    console.error('Error updating head teacher:', error);
    res.status(500).json({ error: 'Error updating head teacher' });
  }
});

// Delete school list
router.delete('/:listId', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.userId;
    
    const schoolList = await SchoolList.findOne({ _id: listId, user: userId });
    if (!schoolList) {
      return res.status(404).json({ error: 'School list not found' });
    }
    
    await SchoolList.deleteOne({ _id: listId });
    
    res.json({ message: 'School list deleted successfully' });
  } catch (error) {
    console.error('Error deleting school list:', error);
    res.status(500).json({ error: 'Error deleting school list' });
  }
});

export default router;

