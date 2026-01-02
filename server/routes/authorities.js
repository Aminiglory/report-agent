import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Authority from '../models/Authority.js';
import SchoolList from '../models/SchoolList.js';

const router = express.Router();

// Get authorities for user (includes head teachers from school lists)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    let authority = await Authority.findOne({ user: userId });
    
    // Create if doesn't exist
    if (!authority) {
      authority = new Authority({ user: userId });
      await authority.save();
    }
    
    // Get all active school lists and extract head teachers
    const schoolLists = await SchoolList.find({ user: userId, is_active: true });
    const headTeachersFromLists = [];
    
    schoolLists.forEach(list => {
      list.schools.forEach(school => {
        if (school.head_teacher && school.head_teacher.name) {
        headTeachersFromLists.push({
          school_name: school.school_name,
          name: school.head_teacher.name,
          title: school.head_teacher.title || 'Head Teacher',
          telephone: school.head_teacher.telephone || '',
          order: school.order,
          school_list_id: list._id.toString(),
          school_list_name: list.name,
          source: 'school_list'
        });
        }
      });
    });
    
    // Get head teachers from Authority model (legacy)
    const headTeachersFromAuthority = authority.head_teachers
      .filter(ht => ht.is_active)
      .map(ht => ({
        school_name: ht.school_name,
        name: ht.name,
        title: ht.title || 'Head Teacher',
        telephone: ht.telephone || '',
        effective_from: ht.effective_from,
        source: 'authority'
      }));
    
    // Merge: prefer school list head teachers, add authority ones that aren't in lists
    const mergedHeadTeachers = [...headTeachersFromLists];
    headTeachersFromAuthority.forEach(authHt => {
      if (!headTeachersFromLists.find(listHt => listHt.school_name === authHt.school_name)) {
        mergedHeadTeachers.push(authHt);
      }
    });
    
    // Sort by order if available, otherwise by school name
    mergedHeadTeachers.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.school_name.localeCompare(b.school_name);
    });
    
    const transformed = {
      ...authority.toObject(),
      id: authority._id.toString(),
      head_teachers_from_lists: mergedHeadTeachers
    };
    
    res.json({ authority: transformed });
  } catch (error) {
    console.error('Error fetching authorities:', error);
    res.status(500).json({ error: 'Error fetching authorities' });
  }
});

// Update sector inspector
router.put('/inspector', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, title, telephone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    let authority = await Authority.findOne({ user: userId });
    if (!authority) {
      authority = new Authority({ user: userId });
    }
    
    authority.sector_inspector = {
      name,
      title: title || 'Sector Education Inspector',
      telephone: telephone || '',
      updated_at: new Date()
    };
    
    await authority.save();
    
    res.json({
      message: 'Sector Inspector updated successfully',
      authority: { ...authority.toObject(), id: authority._id.toString() }
    });
  } catch (error) {
    console.error('Error updating inspector:', error);
    res.status(500).json({ error: 'Error updating inspector' });
  }
});

// Update executive secretary
router.put('/secretary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, title, telephone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    let authority = await Authority.findOne({ user: userId });
    if (!authority) {
      authority = new Authority({ user: userId });
    }
    
    authority.executive_secretary = {
      name,
      title: title || 'Executive Secretary of the Sector',
      telephone: telephone || '',
      updated_at: new Date()
    };
    
    await authority.save();
    
    res.json({
      message: 'Executive Secretary updated successfully',
      authority: { ...authority.toObject(), id: authority._id.toString() }
    });
  } catch (error) {
    console.error('Error updating secretary:', error);
    res.status(500).json({ error: 'Error updating secretary' });
  }
});

// Update head teacher (updates in school list if from school list, otherwise in authority)
router.put('/head-teacher', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { school_name, name, title, telephone, school_list_id } = req.body;
    
    if (!school_name || !name) {
      return res.status(400).json({ error: 'School name and head teacher name are required' });
    }
    
    // If school_list_id is provided, update in school list
    if (school_list_id) {
      const schoolList = await SchoolList.findOne({ _id: school_list_id, user: userId });
      if (!schoolList) {
        return res.status(404).json({ error: 'School list not found' });
      }
      
      const school = schoolList.schools.find(s => s.school_name === school_name);
      if (!school) {
        return res.status(404).json({ error: 'School not found in list' });
      }
      
      school.head_teacher = {
        name,
        title: title || 'Head Teacher',
        telephone: telephone || ''
      };
      
      await schoolList.save();
      
      return res.json({
        message: 'Head Teacher updated successfully',
        updated_in: 'school_list'
      });
    }
    
    // Otherwise update in Authority model
    let authority = await Authority.findOne({ user: userId });
    if (!authority) {
      authority = new Authority({ user: userId });
    }
    
    // Use the method to update head teacher (handles history)
    authority.updateHeadTeacher(school_name, name);
    
    // Update title and telephone if provided
    const newHeadTeacher = authority.head_teachers[authority.head_teachers.length - 1];
    if (title) {
      newHeadTeacher.title = title;
    }
    if (telephone !== undefined) {
      newHeadTeacher.telephone = telephone || '';
    }
    
    await authority.save();
    
    res.json({
      message: 'Head Teacher updated successfully',
      updated_in: 'authority'
    });
  } catch (error) {
    console.error('Error updating head teacher:', error);
    res.status(500).json({ error: 'Error updating head teacher' });
  }
});

// Get head teacher for a school
router.get('/head-teacher/:schoolName', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { schoolName } = req.params;
    
    const authority = await Authority.findOne({ user: userId });
    if (!authority) {
      return res.json({ headTeacher: null });
    }
    
    const headTeacher = authority.getCurrentHeadTeacher(schoolName);
    res.json({ headTeacher });
  } catch (error) {
    console.error('Error fetching head teacher:', error);
    res.status(500).json({ error: 'Error fetching head teacher' });
  }
});

// Get all head teachers
router.get('/head-teachers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const authority = await Authority.findOne({ user: userId });
    if (!authority) {
      return res.json({ headTeachers: [] });
    }
    
    const activeHeadTeachers = authority.head_teachers
      .filter(ht => ht.is_active)
      .map(ht => ({
        school_name: ht.school_name,
        name: ht.name,
        title: ht.title,
        effective_from: ht.effective_from
      }));
    
    res.json({ headTeachers: activeHeadTeachers });
  } catch (error) {
    console.error('Error fetching head teachers:', error);
    res.status(500).json({ error: 'Error fetching head teachers' });
  }
});

export default router;
